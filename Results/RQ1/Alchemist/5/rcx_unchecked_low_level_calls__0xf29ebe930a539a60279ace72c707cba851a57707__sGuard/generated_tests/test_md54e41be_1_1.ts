import { expect } from "chai";
import { ethers } from "hardhat";

describe("Kill mutant md54e41be - msg.value+1", function () {
  it("should detect that mutant sends extra wei, causing owner to receive wrong amount", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund the contract with some ETH first to ensure it has balance for the +1 wei
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("1")
    });

    const sendAmount = ethers.parseEther("0.5");
    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

    // Call go() with exactly 0.5 ETH
    const tx = await instance.connect(addr1).go({ value: sendAmount });
    await tx.wait();

    const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
    const ownerReceived = ownerBalanceAfter - ownerBalanceBefore;

    // In original: owner receives exactly sendAmount (since target.call forwards msg.value and then owner gets remaining balance)
    // In mutant: target.call tries to forward msg.value+1, fails (returns false), then owner gets the full contract balance (sendAmount + previously funded 1 ETH)
    // So owner receives more than sendAmount, which should fail this assertion
    expect(ownerReceived).to.equal(sendAmount);
  });
});