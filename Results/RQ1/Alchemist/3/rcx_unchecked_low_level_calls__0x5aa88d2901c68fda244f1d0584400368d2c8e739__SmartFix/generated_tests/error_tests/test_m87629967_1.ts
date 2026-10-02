import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant kill test - Command sends msg.value-1", function () {
  it("should detect that Command forwards one wei less than msg.value", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance so we can check balances
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0"),
    });

    // Get initial balance of addr2
    const initialBalance = await ethers.provider.getBalance(addr2.address);

    // Owner calls Command with exactly 1 wei, forwarding to addr2
    const tx = await instance.connect(owner).Command(addr2.address, "0x", {
      value: ethers.parseEther("0.000000000000000001"), // 1 wei
    });
    await tx.wait();

    // Get final balance of addr2
    const finalBalance = await ethers.provider.getBalance(addr2.address);

    // Original would forward 1 wei → balance increases by 1 wei
    // Mutant forwards 0 wei → balance stays the same
    expect(finalBalance - initialBalance).to.equal(ethers.parseEther("0.000000000000000001"));
  });
});