import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant detection test", function () {
  it("should kill mutant mc148463c by sending value greater than contract balance", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with some ether first
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10.0")
    });
    
    // Get initial balances
    const initialContractBalance = await ethers.provider.getBalance(await instance.getAddress());
    const initialRecipientBalance = await ethers.provider.getBalance(addr1.address);
    
    // Send a value GREATER than the contract balance (original: >= would trigger, mutant: == would not)
    const sendValue = initialContractBalance + ethers.parseEther("1.0");
    
    // Call multiplicate with value > contract balance
    await instance.connect(owner).multiplicate(addr1.address, { value: sendValue });
    
    // Check that the recipient received the funds (original behavior)
    const finalRecipientBalance = await ethers.provider.getBalance(addr1.address);
    const expectedTransfer = initialContractBalance + sendValue;
    
    // In the original, this transfer would happen. In the mutant, it would NOT happen because msg.value == address(this).balance is false.
    expect(finalRecipientBalance).to.equal(initialRecipientBalance + expectedTransfer);
  });
});