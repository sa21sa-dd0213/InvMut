import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant detection", function () {
  it("should detect mutant that subtracts 1 wei from msg.value in Command", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance so we can check after Command
    const initialFunding = ethers.parseEther("1");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialFunding
    });

    // Record contract balance before Command
    const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());

    // Send 1 ether via Command to addr1, expecting all msg.value to be forwarded
    const sendValue = ethers.parseEther("1");
    const tx = await instance.connect(owner).Command(addr1.address, "0x", { value: sendValue });
    await tx.wait();

    // Check contract balance after - should be 0 if original, 1 wei if mutant
    const balanceAfter = await ethers.provider.getBalance(await instance.getAddress());

    // Original: all funds forwarded (balanceAfter should be 0)
    // Mutant: 1 wei remains (balanceAfter should be 1 wei)
    expect(balanceAfter).to.equal(0);
  });
});