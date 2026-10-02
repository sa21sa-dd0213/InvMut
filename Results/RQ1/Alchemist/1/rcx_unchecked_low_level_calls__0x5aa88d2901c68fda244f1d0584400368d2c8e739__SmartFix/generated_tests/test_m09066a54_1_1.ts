import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 - kill mutant m09066a54 (multiplicate * instead of +)", function () {
  it("should revert when product exceeds balance but sum would be valid", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 5 ether initially
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("5")
    });

    // Call multiplicate with 2 ether: original transfers 5+2=7 ether (succeeds)
    // Mutant tries to transfer 5*2=10 ether (fails because balance is only 5+2=7 after receiving msg.value)
    const tx = instance.connect(owner).multiplicate(addr1.address, {
      value: ethers.parseEther("2")
    });

    await expect(tx).to.be.reverted;
  });
});