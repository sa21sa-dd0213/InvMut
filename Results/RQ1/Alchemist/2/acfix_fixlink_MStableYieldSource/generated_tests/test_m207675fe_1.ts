import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant kill test - m207675fe", function () {
  it("should kill mutant m207675fe by verifying balanceOfToken with small supply", async function () {
    // Get signers
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock mAsset token (ERC20)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mAsset = await MockERC20.deploy("Mock mAsset", "mASSET", 18);
    await mAsset.waitForDeployment();

    // Deploy mock savings contract that implements ISavingsContractV2
    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    const savings = await MockSavings.deploy(await mAsset.getAddress());
    await savings.waitForDeployment();

    // Deploy MStableYieldSource with the mock savings contract
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await savings.getAddress());
    await instance.waitForDeployment();

    // Transfer some mAsset tokens to addr1 for testing
    const supplyAmount = ethers.parseEther("100");
    await mAsset.transfer(addr1.address, supplyAmount);

    // Approve and supply a very small amount (1 wei) to addr2 via supplyTokenTo
    const tinyAmount = ethers.parseUnits("1", "wei"); // 1 wei
    await mAsset.connect(addr1).approve(await instance.getAddress(), tinyAmount);
    await instance.connect(addr1).supplyTokenTo(tinyAmount, addr2.address);

    // Call balanceOfToken for addr2 - should return a very small value (near 0)
    const balance = await instance.balanceOfToken(addr2.address);

    // The correct value should be tiny (essentially 0 when exchange rate is 1e18)
    // The mutant adds 1e18, so it would return ~1e18 which is wrong
    expect(balance).to.be.lessThan(ethers.parseEther("0.000001")); // Should be nearly 0
  });
});