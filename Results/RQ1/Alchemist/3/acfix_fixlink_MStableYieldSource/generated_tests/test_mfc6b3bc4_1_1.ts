import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant mfc6b3bc4 test", function () {
  it("should detect multiplication replaced with addition in balanceOfToken", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock mAsset token (ERC20)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mAsset = await MockERC20.deploy("Mock mAsset", "mASSET", ethers.parseEther("1000000"));
    await mAsset.waitForDeployment();

    // Deploy a mock SavingsContractV2 that returns the mAsset and handles deposits/redemptions
    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    const savings = await MockSavings.deploy(await mAsset.getAddress());
    await savings.waitForDeployment();

    // Deploy MStableYieldSource with the mock savings contract
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await savings.getAddress());
    await instance.waitForDeployment();

    // Give owner some mAsset tokens and approve the yield source
    const supplyAmount = ethers.parseEther("100");
    await mAsset.transfer(owner.address, supplyAmount);
    await mAsset.connect(owner).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Supply tokens to addr1 via the yield source
    await instance.connect(owner).supplyTokenTo(supplyAmount, addr1.address);

    // Get the exchange rate from the mock (default 1e18 for 1:1 rate)
    const exchangeRate = await savings.exchangeRate();

    // Calculate expected balance: (imBalances[addr1] * exchangeRate) / 1e18
    // imBalances[addr1] should equal the credits issued (which equals supplyAmount in mock)
    const expectedBalance = (supplyAmount * exchangeRate) / ethers.parseEther("1");

    // Call balanceOfToken - mutant will return (imBalances[addr1] + exchangeRate) / 1e18 instead
    const actualBalance = await instance.balanceOfToken(addr1.address);

    // Assert that the actual balance matches the expected multiplication-based calculation
    // The mutant would return (supplyAmount + exchangeRate) / 1e18, which is incorrect
    expect(actualBalance).to.equal(expectedBalance);
  });
});