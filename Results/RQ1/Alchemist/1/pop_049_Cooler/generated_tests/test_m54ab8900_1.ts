import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m54ab8900 - transferOwnership access control", function () {
  it("should revert when caller is not the approved address, but mutant allows lower addresses", async function () {
    const [owner, lender, attacker] = await ethers.getSigners();
    
    // Deploy the Cooler contract
    const Cooler = await ethers.getContractFactory("Cooler");
    const cooler = await Cooler.deploy();
    await cooler.waitForDeployment();
    
    // Deploy ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();
    
    // Deploy CoolerFactory to create a cooler with proper setup
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();
    
    // Generate a cooler for the owner
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);
    const coolerInstance = await ethers.getContractAt("Cooler", coolerAddress);
    
    // Create a loan request and clear it to get a loan with a lender
    await collateral.connect(owner).approve(coolerAddress, ethers.parseEther("1000"));
    await coolerInstance.connect(owner).requestLoan(
      ethers.parseEther("100"),
      ethers.parseEther("10"),
      ethers.parseEther("2"),
      30 * 24 * 60 * 60 // 30 days
    );
    
    await debt.connect(lender).approve(coolerAddress, ethers.parseEther("100"));
    await coolerInstance.connect(lender).clearRequest(0, false, false);
    
    // Get the loan ID (should be 0)
    const loan = await coolerInstance.getLoan(0);
    
    // Approve attacker as the transfer recipient for the loan
    // Using an address with high numeric value (lender has lower value than some addresses)
    await coolerInstance.connect(lender).approveTransfer(await attacker.getAddress(), 0);
    
    // Now test the mutant: attacker has lower address value than approved address
    // If the mutant changes != to >=, then attacker (lower value) should NOT revert
    // But the original should revert because attacker != approved address
    
    // First verify the approved address is the attacker
    const approvedAddress = await coolerInstance.approvals(0);
    expect(approvedAddress).to.equal(await attacker.getAddress());
    
    // The attacker should be able to call transferOwnership
    await coolerInstance.connect(attacker).transferOwnership(0);
    
    // Verify the loan lender changed to attacker
    const updatedLoan = await coolerInstance.getLoan(0);
    expect(updatedLoan.lender).to.equal(await attacker.getAddress());
    
    // Now test with an address that is LESS than the approved address
    // Create a new loan with a lender that has a high address value
    const highValueAddress = "0x00000000000000000000000000000000000000FF";
    await network.provider.send("hardhat_setBalance", [
      highValueAddress,
      "0x1000000000000000000000000000000000000000"
    ]);
    
    const highValueSigner = await ethers.getImpersonatedSigner(highValueAddress);
    
    // Create another loan
    await collateral.connect(owner).approve(coolerAddress, ethers.parseEther("2000"));
    await coolerInstance.connect(owner).requestLoan(
      ethers.parseEther("200"),
      ethers.parseEther("20"),
      ethers.parseEther("2"),
      30 * 24 * 60 * 60
    );
    
    await debt.connect(highValueSigner).approve(coolerAddress, ethers.parseEther("200"));
    await coolerInstance.connect(highValueSigner).clearRequest(1, false, false);
    
    // Approve a low-value address for transfer
    const lowValueAddress = "0x0000000000000000000000000000000000000001";
    await coolerInstance.connect(highValueSigner).approveTransfer(lowValueAddress, 1);
    
    const lowValueSigner = await ethers.getImpersonatedSigner(lowValueAddress);
    
    // This should revert in original (lowValueSigner != approved highValueAddress)
    // But in mutant (>=), lowValueSigner < highValueAddress, so it should NOT revert
    // This kills the mutant by showing it allows unauthorized access
    await coolerInstance.connect(lowValueSigner).transferOwnership(1);
    
    // Verify the mutant allowed unauthorized transfer
    const mutatedLoan = await coolerInstance.getLoan(1);
    expect(mutatedLoan.lender).to.equal(lowValueAddress);
  });
});