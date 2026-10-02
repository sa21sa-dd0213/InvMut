import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant test - mc70f3ddf", function () {
  it("should detect mutant that uses msg.value+1 instead of msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Send 1 ether to the go function
    const sendAmount = ethers.parseEther("1");
    const tx = await instance.connect(addr1).go({ value: sendAmount });
    await tx.wait();

    // Check that the contract balance is zero after execution
    const contractBalance = await ethers.provider.getBalance(contractAddress);
    expect(contractBalance).to.equal(0);

    // Also verify the owner received the correct amount
    const ownerBalance = await ethers.provider.getBalance(owner.address);
    // The owner should have received exactly 1 ether (minus gas costs)
    expect(ownerBalance).to.be.gt(ethers.parseEther("10000")); // assuming initial balance > 10000 ETH
  });
});