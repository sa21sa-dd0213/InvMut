import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MultiplicatorX4 mutant detection", function () {
  it("should detect mutant that changes >= to == in multiplicate function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with some initial balance
    const initialFundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialFundAmount
    });
    
    // Get the contract balance before the attack
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    
    // Send more than the current balance to multiplicate
    // Current balance is 1 ETH, so we send 2 ETH (greater than balance)
    const sendAmount = ethers.parseEther("2.0");
    const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);
    
    // Execute multiplicate with msg.value > contract balance
    await instance.connect(owner).multiplicate(addr1.address, { value: sendAmount });
    
    // Check that addr1 received the funds (original behavior)
    // In original: if(msg.value >= balance) transfers balance+msg.value
    // In mutant: if(msg.value == balance) - this condition fails with 2 != 1
    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);
    
    // If original code runs: addr1 receives balance (1) + msg.value (2) = 3 ETH
    // If mutant code runs: condition fails, no transfer, addr1 gets nothing extra
    const expectedTransferOriginal = initialFundAmount + sendAmount;
    const actualTransfer = addr1BalanceAfter - addr1BalanceBefore;
    
    // The mutant will fail this assertion because no transfer happens
    expect(actualTransfer).to.equal(expectedTransferOriginal);
  });
});