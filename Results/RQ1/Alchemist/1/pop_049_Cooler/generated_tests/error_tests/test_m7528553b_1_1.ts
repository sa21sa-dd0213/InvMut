import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant test - claimDefaulted division vs subtraction", function () {
  it("should detect the mutant by verifying the correct return value for time since default", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();

    // Deploy factory (which deploys Cooler implementation)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20.deploy("Collateral", "COL", 18);
    const debt = await ERC20.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();

    // Generate a cooler for borrower
    await factory.connect(borrower).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = await factory.coolerFor(borrower.address, await collateral.getAddress(), await debt.getAddress());
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: borrower creates a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("10");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 7 * 24 * 60 * 60; // 7 days in seconds

    // Approve and provide collateral
    const collateralAmount = await cooler.collateralFor(amount, loanToCollateral);
    await collateral.connect(borrower).approve(await cooler.getAddress(), collateralAmount);
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender clears the request
    await debt.connect(lender).approve(await cooler.getAddress(), amount);
    await cooler.connect(lender).clearRequest(0, false, false);

    // Fast forward past the loan expiry to make it defaulted
    await ethers.provider.send("evm_increaseTime", [duration + 1000]);
    await ethers.provider.send("evm_mine", []);

    // Get the current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore.timestamp;

    // Get loan details to know expiry
    const loan = await cooler.getLoan(0);
    const expiry = loan.expiry;

    // Call claimDefaulted
    const tx = await cooler.connect(lender).claimDefaulted(0);
    const receipt = await tx.wait();

    // Decode the return value from the transaction
    // The function returns (uint256, uint256, uint256)
    const iface = new ethers.Interface([
      "function claimDefaulted(uint256 loanID_) external returns (uint256, uint256, uint256)"
    ]);
    const decoded = iface.decodeFunctionResult("claimDefaulted", receipt.logs[0].data);

    // Get the third return value (time since default)
    const timeSinceDefault = decoded[2];

    // Expected: block.timestamp - loan.expiry (subtraction)
    const expectedTimeSinceDefault = currentTimestamp - Number(expiry);

    // If mutant is present (division), this will be wrong
    // If original (subtraction), this will be correct
    expect(timeSinceDefault).to.equal(expectedTimeSinceDefault);
  });
});