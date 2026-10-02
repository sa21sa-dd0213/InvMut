import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant detection - balanceOfToken", function () {
  it("should detect the division to subtraction mutant in balanceOfToken", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy a mock savings contract that returns a known exchange rate
    // and handles depositSavings/redeemUnderlying
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();

    // Deploy MStableYieldSource with the mock savings
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Get the underlying mAsset token address from the mock
    const mAssetAddress = await mockSavings.underlying();
    const mAsset = await ethers.getContractAt("IERC20", mAssetAddress);

    // Fund the user with mAsset tokens
    const initialBalance = ethers.parseEther("2000");
    await mAsset.connect(owner).transfer(user.address, initialBalance);

    // Approve and supply tokens to create a balance
    await mAsset.connect(user).approve(await instance.getAddress(), initialBalance);
    const supplyAmount = ethers.parseEther("1000");
    await instance.connect(user).supplyTokenTo(supplyAmount, user.address);

    // Set exchange rate to something other than 1:1 (e.g., 1.5)
    await mockSavings.setExchangeRate(ethers.parseEther("1.5"));

    // Call balanceOfToken - original should return (imBalances * 1.5e18) / 1e18 = imBalances * 1.5
    // Mutant returns (imBalances * 1.5e18) - 1e18 which is wrong
    const balance = await instance.balanceOfToken(user.address);

    // Expected: supplyAmount * 1.5 (since depositSavings returns supplyAmount in mock)
    const expectedBalance = ethers.parseEther("1500"); // 1000 * 1.5
    expect(balance).to.equal(expectedBalance);
  });
});