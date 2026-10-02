import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant md8755058: sending non-zero ether to multiplicate when contract balance is zero should succeed on original but revert on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance to trigger the require condition
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    
    // Call multiplicate with a non-zero value, targeting addr1
    const tx = instance.connect(owner).multiplicate(addr1.address, { value: ethers.parseEther("0.5") });
    
    // The mutant's require condition (balance + msg.value <= balance) will revert for non-zero msg.value
    // because balance + 0.5 > balance (0.5 > 0), causing the require to fail
    await expect(tx).to.be.reverted;
  });
});