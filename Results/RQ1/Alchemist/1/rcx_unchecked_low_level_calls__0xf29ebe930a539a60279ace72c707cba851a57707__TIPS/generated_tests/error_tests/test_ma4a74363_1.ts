import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant ma4a74363 test", function () {
  it("should detect that mutant sends Ether to itself instead of external address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const externalAddress = "0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C";
    const externalBalanceBefore = await ethers.provider.getBalance(externalAddress);
    const contractBalanceBefore = await ethers.provider.getBalance(instance.target);
    
    const sendAmount = ethers.parseEther("1.0");
    
    // Send Ether via go() from addr1
    const tx = await instance.connect(addr1).go({ value: sendAmount });
    await tx.wait();

    const externalBalanceAfter = await ethers.provider.getBalance(externalAddress);
    const contractBalanceAfter = await ethers.provider.getBalance(instance.target);

    // In the original, external address receives the funds; in mutant, contract keeps them
    expect(externalBalanceAfter).to.equal(externalBalanceBefore);
    expect(contractBalanceAfter).to.equal(contractBalanceBefore + sendAmount);
  });
});