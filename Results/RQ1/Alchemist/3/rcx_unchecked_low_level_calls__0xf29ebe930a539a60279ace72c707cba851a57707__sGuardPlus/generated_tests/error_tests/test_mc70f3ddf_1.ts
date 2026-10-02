import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant test - mc70f3ddf", function () {
  it("should fail when sending 1 ether because mutant tries to send msg.value+1", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the contract
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund the contract with some ether via fallback
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });

    // Call go() with exactly 1 ether from attacker
    const tx = instance.connect(attacker).go({
      value: ethers.parseEther("1")
    });

    // The mutant will try to send msg.value+1 = 1.000000000000000001 ether
    // which is more than the contract received in this transaction
    // This should cause the internal call to fail or the require to revert
    await expect(tx).to.be.reverted;
  });
});