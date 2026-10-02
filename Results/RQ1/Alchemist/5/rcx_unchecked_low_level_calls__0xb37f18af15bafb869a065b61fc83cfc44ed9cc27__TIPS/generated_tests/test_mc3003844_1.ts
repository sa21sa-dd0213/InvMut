import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet - kill mutant mc3003844", function () {
  it("should succeed when sending ether to a valid recipient, but mutant always reverts", async function () {
    const [owner, recipient] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the wallet with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0"),
    });

    // Get initial balance of recipient
    const initialRecipientBalance = await ethers.provider.getBalance(recipient.address);

    // Send 0.5 ether to recipient - this should succeed in original but revert in mutant
    const tx = instance.connect(owner).sendMoney(recipient.address, ethers.parseEther("0.5"));
    
    // In the original, this transaction should succeed
    // In the mutant (if (true) always reverts), it will fail
    await expect(tx).to.not.be.reverted;

    // Verify the recipient actually received the funds (confirms original behavior)
    const finalRecipientBalance = await ethers.provider.getBalance(recipient.address);
    expect(finalRecipientBalance).to.equal(initialRecipientBalance + ethers.parseEther("0.5"));
  });
});