import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant test - mc8757a44", function () {
  it("should detect mutant that subtracts 1 from msg.value in Put function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    
    // Deploy with constructor arguments (none required for MONEY_BOX)
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 1 wei to Put function
    const tx = await instance.connect(addr1).Put(0, { value: ethers.parseEther("0.000000000000000001") });
    await tx.wait();

    // Check the stored balance for addr1
    const holder = await instance.Acc(addr1.address);
    const balance = holder.balance;

    // On original contract, balance should be 1 wei
    // On mutant (msg.value - 1), balance will be 0 wei
    expect(balance).to.equal(ethers.parseEther("0.000000000000000001"));
  });
});