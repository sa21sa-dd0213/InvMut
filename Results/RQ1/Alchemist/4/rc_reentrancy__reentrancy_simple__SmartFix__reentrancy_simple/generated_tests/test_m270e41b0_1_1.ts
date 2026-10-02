import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant detection - m270e41b0", function () {
  it("should kill the mutant by sending 0 wei to addToBalance", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Original: sending 0 wei should succeed (balance stays 0)
    // Mutant: require(((userBalance[msg.sender] + msg.value-1) >= userBalance[msg.sender]))
    // becomes require((0 + 0 - 1) >= 0) which underflows and reverts in Solidity 0.8+
    const tx = instance.connect(owner).addToBalance({ value: 0 });
    await expect(tx).to.not.be.reverted;
  });
});