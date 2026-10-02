import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant kill test - me01ced96", function () {
  it("should detect mutant that removes depositToken return value", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy a mock mAsset token (simple ERC20)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mAsset = await MockERC20.deploy("Mock MAsset", "mMASS", ethers.parseEther("1000000"));
    await mAsset.waitForDeployment();

    // Deploy a mock SavingsContractV2 that returns the mAsset address
    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    const savings = await MockSavings.deploy(await mAsset.getAddress());
    await savings.waitForDeployment();

    // Deploy MStableYieldSource
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await savings.getAddress());
    await instance.waitForDeployment();

    // The original depositToken should return the mAsset address
    const returnedAddress = await instance.depositToken();

    // Assert that the returned address is not the zero address (mutant returns address(0))
    expect(returnedAddress).to.not.equal(ethers.ZeroAddress);

    // Assert that the returned address matches the actual mAsset address
    expect(returnedAddress).to.equal(await mAsset.getAddress());
  });
});