import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m333a4af1 - sendMoney modifier removed", function () {
  it("should revert when non-owner calls sendMoney on original, but succeed on mutant", async function () {
    const [owner, nonOwner, recipient] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the wallet with some ether first
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();
    
    // Non-owner attempts to send ether from the wallet to recipient
    // On original (with modifier) this should revert; on mutant it will succeed
    const sendValue = ethers.parseEther("0.5");
    
    // If the mutant is deployed, this call will succeed (no revert)
    // We expect it to NOT revert, which would kill the mutant
    await expect(
      instance.connect(nonOwner).sendMoney(recipient.address, sendValue)
    ).to.not.be.reverted;
    
    // Verify the recipient actually received the funds
    const recipientBalance = await ethers.provider.getBalance(recipient.address);
    expect(recipientBalance).to.equal(sendValue);
  });
});