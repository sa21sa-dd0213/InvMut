import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m184d331b - claimDefaulted callback", function () {
  it("should revert when calling claimDefaulted on a loan without callback", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();

    // Deploy a mock ERC20 for collateral and debt tokens
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20Factory.deploy("Collateral", "COLL", 18);
    const debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();

    // Deploy CoolerFactory which deploys Cooler implementation
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Generate a cooler for the owner
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: owner has collateral, lender has debt
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("10");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 7 * 24 * 60 * 60; // 7 days

    // Mint tokens to owner and lender
    await collateral.mint(owner.address, ethers.parseEther("1000"));
    await debt.mint(lender.address, ethers.parseEther("1000"));

    // Approve cooler to spend tokens
    await collateral.connect(owner).approve(coolerAddress, ethers.parseEther("1000"));
    await debt.connect(lender).approve(coolerAddress, ethers.parseEther("1000"));

    // Owner creates a loan request
    const reqID = await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);
    await reqID.wait();

    // Lender clears the request with isCallback_ = false (the 3rd parameter)
    const clearTx = await cooler.connect(lender).clearRequest(0, false, false);
    await clearTx.wait();

    // Fast forward past loan expiry
    await ethers.provider.send("evm_increaseTime", [duration + 1]);
    await ethers.provider.send("evm_mine", []);

    // Now call claimDefaulted - this should revert in the mutant because
    // it tries to call onDefault on lender which doesn't implement CoolerCallback
    await expect(
      cooler.connect(lender).claimDefaulted(0)
    ).to.be.reverted;
  });
});