import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m48540683 - migrateTo access control", function () {
  it("should revert when non-creator calls migrateTo", async function () {
    const [creator, attacker, recipient] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with some ether
    await creator.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // Attacker tries to call migrateTo - should revert in original, succeed in mutant
    await expect(
      instance.connect(attacker).migrateTo(recipient.address)
    ).to.be.reverted;
  });
});