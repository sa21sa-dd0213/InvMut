import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant m363d76ba detection", function () {
  it("should detect mutant by calling multiplicate with non-zero msg.value when contract has balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with some ETH first
    const fundAmount = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });
    
    // Now call multiplicate with a non-zero msg.value
    const sendAmount = ethers.parseEther("5");
    const tx = instance.connect(owner).multiplicate(addr1.address, { value: sendAmount });
    
    // In the original contract, this should succeed (condition balance + msg.value >= balance is always true)
    // In the mutant, this should revert because (balance - msg.value) >= balance is false when msg.value > 0
    await expect(tx).to.not.be.reverted;
  });
});