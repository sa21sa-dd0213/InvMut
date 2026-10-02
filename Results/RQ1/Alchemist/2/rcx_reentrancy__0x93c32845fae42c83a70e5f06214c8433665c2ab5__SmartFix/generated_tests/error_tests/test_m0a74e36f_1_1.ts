import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant kill test", function () {
  it("should allow Put with non-zero msg.value (detects mutant arithmetic change)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy X_WALLET with the Log contract address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Call Put with 1 ether from addr1 - should succeed in original, revert in mutant
    const tx = instance.connect(addr1).Put(0, { value: ethers.parseEther("1") });

    // In the original contract, this call succeeds
    // In the mutant, the require((acc.balance - msg.value) >= acc.balance) fails
    // because subtracting 1 ether from 0 balance gives -1 ether which is not >= 0
    await expect(tx).to.not.be.reverted;
  });
});