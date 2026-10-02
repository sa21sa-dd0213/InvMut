import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m97a1f4fc - isDefaulted", function () {
  it("should return true when loan is defaulted (block.timestamp > expiry)", async function () {
    const [owner, lender] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    const debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();

    // Deploy CoolerFactory (which deploys Cooler implementation)
    const Factory = await ethers.getContractFactory("CoolerFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Generate a cooler for owner
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Owner creates a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 3600; // 1 hour

    // Mint tokens and approve
    await collateral.mint(owner.address, ethers.parseEther("1000"));
    await collateral.connect(owner).approve(coolerAddress, ethers.parseEther("1000"));
    await debt.mint(lender.address, ethers.parseEther("1000"));
    await debt.connect(lender).approve(coolerAddress, ethers.parseEther("1000"));

    // Request loan
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);

    // Clear the request (lender funds the loan)
    await cooler.connect(lender).clearRequest(0, false, false);

    // Fast forward time past expiry
    await ethers.provider.send("evm_increaseTime", [duration + 1]);
    await ethers.provider.send("evm_mine", []);

    // Check isDefaulted - should return true because block.timestamp > expiry
    const isDefaulted = await cooler.isDefaulted(0);
    expect(isDefaulted).to.equal(true);
  });
});