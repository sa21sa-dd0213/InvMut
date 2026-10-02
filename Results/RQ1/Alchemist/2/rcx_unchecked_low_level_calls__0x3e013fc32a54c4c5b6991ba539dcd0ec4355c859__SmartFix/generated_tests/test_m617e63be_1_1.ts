import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - kill mutant m617e63be", function () {
  it("should kill mutant by sending amount smaller than contract balance and verifying no transfer occurs", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 1 ether via owner
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    const addr2BalanceBefore = await ethers.provider.getBalance(addr2.address);

    // Send 0.5 ether (less than contract balance of 1 ether) from owner to trigger multiplicate
    const tx = await instance.connect(owner).multiplicate(addr2.address, {
      value: ethers.parseEther("0.5")
    });
    await tx.wait();

    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    const addr2BalanceAfter = await ethers.provider.getBalance(addr2.address);

    // Original contract: condition msg.value >= address(this).balance is false (0.5 < 1.0)
    // So no transfer should happen
    expect(addr2BalanceAfter).to.equal(addr2BalanceBefore);
    expect(contractBalanceAfter).to.equal(contractBalanceBefore);
  });
});