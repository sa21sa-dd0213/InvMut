import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant kill test - balanceOfToken operator mutation", function () {
  it("should kill mutant m207675fe by verifying correct balance calculation after deposit", async function () {
    // Get signers
    const [owner, user] = await ethers.getSigners();

    // Deploy a mock mAsset token (ERC20)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mAsset = await MockERC20.deploy("Mock mAsset", "mASSET", 18);
    await mAsset.waitForDeployment();

    // Deploy a mock savings contract that implements ISavingsContractV2
    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    const savings = await MockSavings.deploy(await mAsset.getAddress());
    await savings.waitForDeployment();

    // Mint tokens to user for deposit
    const depositAmount = ethers.parseEther("100");
    await mAsset.mint(user.address, depositAmount);
    await mAsset.connect(user).approve(await savings.getAddress(), depositAmount);

    // Deploy MStableYieldSource with the mock savings contract
    const MStableYieldSource = await ethers.getContractFactory("MStableYieldSource");
    const yieldSource = await MStableYieldSource.deploy(await savings.getAddress());
    await yieldSource.waitForDeployment();

    // Approve yieldSource to spend user's mAsset tokens
    await mAsset.connect(user).approve(await yieldSource.getAddress(), depositAmount);

    // Deposit tokens via supplyTokenTo
    const tx = await yieldSource.connect(user).supplyTokenTo(depositAmount, user.address);
    await tx.wait();

    // Get the exchange rate from the mock savings contract
    const exchangeRate = await savings.exchangeRate();

    // Calculate expected balance: (imBalances[user] * exchangeRate) / 1e18
    // The imBalances[user] should equal the creditsIssued from depositSavings
    // In the mock, depositSavings returns the deposited amount (1:1 credit ratio)
    const creditsIssued = depositAmount;
    const expectedBalance = (creditsIssued * exchangeRate) / 1000000000000000000n; // Fixed: divide by 1e18 properly

    // Call balanceOfToken - original divides by 1e18, mutant adds 1e18
    const actualBalance = await yieldSource.balanceOfToken(user.address);

    // Assert that the balance matches the expected value
    // The mutant will return (creditsIssued * exchangeRate) + 1e18, which will be different
    expect(actualBalance).to.equal(expectedBalance);
  });
});