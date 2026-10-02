import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - m277fac66", function () {
  it("should kill mutant by sending exactly 10 ether and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balance of addr1
    const initialBalance = await ethers.provider.getBalance(addr1.address);

    // Send exactly 10 ether to trigger fallback
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // The mutant requires msg.value - 1 == 10 ether, so sending 10 ether would make
    // msg.value - 1 = 9 ether, causing revert. Original would succeed.
    // If transaction succeeded, mutant is killed (original behavior)
    const finalBalance = await ethers.provider.getBalance(addr1.address);
    expect(finalBalance).to.be.lessThan(initialBalance);
  });
});