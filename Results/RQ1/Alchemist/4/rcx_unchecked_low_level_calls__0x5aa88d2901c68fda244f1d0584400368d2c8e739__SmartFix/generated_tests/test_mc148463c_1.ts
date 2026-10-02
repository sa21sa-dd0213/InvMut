import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MultiplicatorX3 mutant kill test", function () {
  it("should detect mutant that changed >= to == in multiplicate", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Record initial balances
    const initialRecipientBalance = await ethers.provider.getBalance(addr2.address);
    const initialContractBalance = await ethers.provider.getBalance(await instance.getAddress());

    // Send more than the current contract balance (e.g., 11 ETH when balance is 10 ETH)
    const sendAmount = ethers.parseEther("11");
    await instance.connect(owner).multiplicate(addr2.address, { value: sendAmount });

    // After original: recipient gets contract balance (10 + 11 = 21 ETH)
    // After mutant: condition msg.value == address(this).balance fails (11 != 10), so no transfer
    const finalRecipientBalance = await ethers.provider.getBalance(addr2.address);
    const expectedTransfer = initialContractBalance + sendAmount;

    // In the original, recipient balance increases by the full contract balance after the send
    // In the mutant, recipient balance remains unchanged
    expect(finalRecipientBalance).to.equal(initialRecipientBalance + expectedTransfer);
  });
});