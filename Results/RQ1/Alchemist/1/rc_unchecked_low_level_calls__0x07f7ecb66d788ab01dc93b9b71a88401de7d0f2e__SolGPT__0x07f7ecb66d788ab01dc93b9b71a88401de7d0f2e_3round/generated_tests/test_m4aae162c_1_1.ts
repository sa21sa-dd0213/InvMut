import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m4aae162c - ethBalance return value test", function () {
  it("should return correct ether balance after sending ether to the contract", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const whaleAddress = addr1.address;
    const wagerLimit = ethers.parseEther("1");

    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();

    // Send some ether to the contract
    const sendAmount = ethers.parseEther("5");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: sendAmount
    });

    // Call ethBalance and verify it returns the correct balance
    const balance = await instance.ethBalance();
    expect(balance).to.equal(sendAmount);
  });
});