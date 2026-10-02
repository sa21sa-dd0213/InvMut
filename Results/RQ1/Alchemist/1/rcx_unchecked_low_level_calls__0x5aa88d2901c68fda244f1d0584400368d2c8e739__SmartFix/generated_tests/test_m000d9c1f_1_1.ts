import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant detection", function () {
  it("should detect mutant m000d9c1f where condition is replaced with true", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 2 ETH
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("2")
    });

    // Get initial contract balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(initialBalance).to.equal(ethers.parseEther("2"));

    // Attempt to call multiplicate with only 1 ETH (less than contract balance)
    const tx = instance.connect(addr1).multiplicate(addr1.address, { value: ethers.parseEther("1") });

    // On original contract: should revert because msg.value (1) < address(this).balance (2)
    // On mutant: will succeed because condition is always true
    await expect(tx).to.be.reverted;
  });
});