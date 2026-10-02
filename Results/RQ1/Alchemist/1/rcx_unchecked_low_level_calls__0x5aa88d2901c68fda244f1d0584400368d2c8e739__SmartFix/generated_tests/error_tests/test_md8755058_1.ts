import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant detection test", function () {
  it("should detect mutant md8755058 by calling multiplicate with positive msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());
    
    // Call multiplicate with msg.value equal to current balance (so condition msg.value >= address(this).balance holds)
    // Original would succeed, mutant would revert due to <= check
    const tx = instance.connect(owner).multiplicate(addr1.address, {
      value: initialBalance
    });

    // The original contract would succeed, but the mutant reverts
    await expect(tx).to.not.be.reverted;
  });
});