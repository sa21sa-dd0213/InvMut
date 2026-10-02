import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 - mutant kill test for maeb80bde", function () {
  it("should kill mutant by calling multiplicate with positive msg.value and expect success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund contract with 1 ETH
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);
    
    // Call multiplicate with msg.value >= contract balance
    const msgValue = ethers.parseEther("1.0");
    await instance.connect(owner).multiplicate(addr1.address, { value: msgValue });

    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);

    // Original: transfers contractBalanceBefore + msgValue to addr1
    // Mutant: require check fails and reverts for positive msg.value
    expect(addr1BalanceAfter - addr1BalanceBefore).to.equal(contractBalanceBefore + msgValue);
    expect(contractBalanceAfter).to.equal(0n);
  });
});