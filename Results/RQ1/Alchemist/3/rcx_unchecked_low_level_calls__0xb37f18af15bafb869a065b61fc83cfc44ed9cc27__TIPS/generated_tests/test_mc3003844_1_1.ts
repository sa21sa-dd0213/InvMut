import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - sendMoney with always revert", function () {
  it("should kill mutant mc3003844 by sending to a payable target and checking target balance increases", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple payable contract to receive funds
    const ReceiverFactory = await ethers.getContractFactory("SimpleWallet");
    const receiver = await ReceiverFactory.deploy();
    await receiver.waitForDeployment();

    const sendValue = ethers.parseEther("1.0");
    const receiverBefore = await ethers.provider.getBalance(receiver.target);

    // Call sendMoney - in original it succeeds, in mutant it reverts
    const tx = instance.connect(owner).sendMoney(receiver.target, sendValue);
    
    // In original: call succeeds, target balance increases
    // In mutant: always reverts due to if(true) condition
    await expect(tx).to.not.be.reverted;

    const receiverAfter = await ethers.provider.getBalance(receiver.target);
    expect(receiverAfter - receiverBefore).to.equal(sendValue);
  });
});