import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant detection - md9b125e9", function () {
  it("should kill mutant by sending insufficient ether to multiplicate and expecting no transfer", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance (e.g., 10 ether)
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await fundTx.wait();

    // Get initial balance of addr1
    const initialBalance = await ethers.provider.getBalance(addr1.address);

    // Attempt to call multiplicate with msg.value < contract balance (e.g., 1 ether)
    const tx = instance.connect(addr1).multiplicate(addr1.address, { value: ethers.parseEther("1") });

    // The original contract would do nothing (condition false), so addr1 balance should remain unchanged
    // The mutant (if(true)) would drain all funds to addr1, changing its balance
    await expect(tx).to.not.changeEtherBalance(addr1, ethers.parseEther("10"));

    // Additional check: contract balance should remain unchanged if original logic executes
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(ethers.parseEther("10"));
  });
});