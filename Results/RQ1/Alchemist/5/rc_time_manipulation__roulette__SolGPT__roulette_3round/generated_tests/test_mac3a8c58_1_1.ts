import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mac3a8c58 detection test", function () {
  it("should kill mutant that changes == to != in block.number % 15 condition", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balance of addr1
    const initialBalance = await ethers.provider.getBalance(addr1.address);

    // We need to call fallback on a block where block.number % 15 == 0
    // Mine blocks until we reach such a block
    let currentBlock = await ethers.provider.getBlock("latest");
    while (currentBlock.number % 15n !== 0n) {
      await ethers.provider.send("evm_mine", []);
      currentBlock = await ethers.provider.getBlock("latest");
    }

    // Fund the contract with 10 ether for the test
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Get contract balance before the call
    const contractBalanceBefore = await ethers.provider.getBalance(
      await instance.getAddress()
    );

    // Call fallback from addr1 with exactly 10 ether
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10"),
      gasLimit: 100000
    });
    await tx.wait();

    // Check addr1's balance after the call
    const finalBalance = await ethers.provider.getBalance(addr1.address);

    // On original: transfer should happen (addr1 gets contract balance)
    // On mutant: transfer does NOT happen (condition != 0 fails)
    const balanceDifference = finalBalance - initialBalance;

    // If mutant is present, addr1 only lost 10 ether (no transfer back)
    // If original, addr1 gained contract balance (10 ether transfer back)
    // We detect the mutant by checking that the balance change is not just -10 ether
    // (i.e., that the transfer occurred)
    expect(balanceDifference).to.be.gt(ethers.parseEther("0"));
  });
});