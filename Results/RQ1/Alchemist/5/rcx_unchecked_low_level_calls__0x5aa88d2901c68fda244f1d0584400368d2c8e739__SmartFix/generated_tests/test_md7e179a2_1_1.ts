import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 - Kill mutant md7e179a2 (>= changed to >)", function () {
  it("should transfer when msg.value equals contract balance (kills mutant with strict >)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 1 ether via receive()
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalanceBefore).to.equal(ethers.parseEther("1.0"));

    // addr1 sends exactly 1 ether to multiplicate
    // In original: msg.value (1) >= contract balance (1) => true => transfer occurs
    // In mutant: msg.value (1) > contract balance (1) => false => no transfer
    const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);

    await instance.connect(addr1).multiplicate(addr1.address, { value: ethers.parseEther("1.0") });

    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());

    // If original: contract balance goes to 0, addr1 receives ~2 ether (1 original + 1 sent)
    // If mutant: contract balance stays 1 ether, addr1 gets nothing back
    expect(contractBalanceAfter).to.equal(0);
    expect(addr1BalanceAfter).to.be.gt(addr1BalanceBefore);
  });
});