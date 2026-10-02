import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant m2b71aeee test", function () {
  it("should detect multiplication mutant by verifying sum vs product transfer", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund the contract with 1 ether via receive function
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("1")
    });

    // Get initial balance of addr2 (recipient)
    const initialBalance = await ethers.provider.getBalance(addr2.address);

    // Call multiplicate with 2 ether
    // Original would send: 1 + 2 = 3 ether
    // Mutant would send: 1 * 2 = 2 ether
    const tx = await instance.connect(owner).multiplicate(addr2.address, {
      value: ethers.parseEther("2")
    });
    await tx.wait();

    const finalBalance = await ethers.provider.getBalance(addr2.address);
    const transferredAmount = finalBalance - initialBalance;

    // Original contract would transfer 3 ether (sum)
    // Mutant would transfer 2 ether (product)
    // Expect sum behavior (original) to fail on mutant
    expect(transferredAmount).to.equal(ethers.parseEther("3"));
  });
});