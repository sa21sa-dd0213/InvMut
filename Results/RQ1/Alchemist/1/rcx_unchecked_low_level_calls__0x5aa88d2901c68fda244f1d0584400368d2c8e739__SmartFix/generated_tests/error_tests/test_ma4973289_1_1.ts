import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant ma4973289 detection", function () {
  it("should detect the mutant by verifying exact msg.value forwarding", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance for safety
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Get initial balance of target address
    const initialBalance = await ethers.provider.getBalance(addr1.address);

    // Send exact 1 ether via Command function
    const sendAmount = ethers.parseEther("1");
    const data = "0x";
    const tx = await instance.connect(owner).Command(addr1.address, data, {
      value: sendAmount
    });
    await tx.wait();

    // Get final balance of target address
    const finalBalance = await ethers.provider.getBalance(addr1.address);
    const actualReceived = finalBalance - initialBalance;

    // In original: should equal exactly sendAmount (1 ether)
    // In mutant: would be sendAmount + 1 wei (1 ether + 1 wei)
    expect(actualReceived).to.equal(sendAmount);
  });
});