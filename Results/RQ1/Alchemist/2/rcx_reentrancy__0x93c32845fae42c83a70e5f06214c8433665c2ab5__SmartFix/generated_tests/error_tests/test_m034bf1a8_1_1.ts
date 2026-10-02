import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant m034bf1a8 test", function () {
  it("should kill mutant by sending 0 value to Put function", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy X_WALLET with the Log contract address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();

    // Test: send 0 ether to Put function - should revert in mutant but pass in original
    // The mutant changes require(acc.balance + msg.value >= acc.balance)
    // to require(acc.balance + msg.value - 1 >= acc.balance)
    // With msg.value = 0, the original passes (acc.balance >= acc.balance)
    // But mutant evaluates to (acc.balance - 1 >= acc.balance) which is false
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: 0,
        data: ethers.id("Put(uint256)").slice(0, 10) +
               ethers.zeroPadValue(ethers.toBeHex(block.timestamp + 100n), 32).slice(2)
      })
    ).to.be.reverted;
  });
});