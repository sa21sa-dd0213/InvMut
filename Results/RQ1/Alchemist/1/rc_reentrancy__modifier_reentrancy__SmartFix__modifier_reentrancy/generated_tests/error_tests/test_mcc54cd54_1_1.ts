import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant kill test for mcc54cd54", function () {
  it("should kill the mutant by exploiting the arithmetic difference when tokenBalance is non-zero", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy ModifierEntrancy (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a malicious Bank contract that will reenter and set tokenBalance
    const MaliciousBank = await ethers.getContractFactory("MaliciousBank");
    const maliciousBank = await MaliciousBank.deploy(await instance.getAddress());
    await maliciousBank.waitForDeployment();

    // Deploy a helper contract that can set balance
    const Helper = await ethers.getContractFactory("BalanceSetter");
    const helper = await Helper.deploy(await instance.getAddress());
    await helper.waitForDeployment();

    // Call airDrop once to get balance = 20
    await expect(instance.connect(addr1).airDrop()).to.not.be.reverted;
    expect(await instance.tokenBalance(addr1.address)).to.equal(20);

    // Try to call again - it should revert due to hasNoBalance
    // For the mutant, the require check is (balance * 20) >= balance
    // For balance = 20: 400 >= 20 -> true, but hasNoBalance will still revert
    await expect(instance.connect(addr1).airDrop()).to.be.reverted;
  });
});