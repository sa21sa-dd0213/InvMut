import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet - mutant mc3003844 test", function () {
  it("should kill mutant by verifying sendMoney succeeds when call target is valid", async function () {
    const [owner, recipient] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the wallet with some ether
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Get recipient's balance before the call
    const balanceBefore = await ethers.provider.getBalance(recipient.address);

    // Call sendMoney with a valid recipient and amount
    const sendAmount = ethers.parseEther("0.5");
    await instance.connect(owner).sendMoney(recipient.address, sendAmount);

    // Verify the recipient received the funds (original behavior)
    const balanceAfter = await ethers.provider.getBalance(recipient.address);
    expect(balanceAfter - balanceBefore).to.equal(sendAmount);
  });
});