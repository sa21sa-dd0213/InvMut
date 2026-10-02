import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant detection", function () {
  it("should kill mutant mdbb0f758 by verifying successful airDrop call", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Bank contract first (needed for supportsToken modifier)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // Deploy ModifierEntrancy (no constructor arguments needed)
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await ModifierEntrancyFactory.deploy();
    await instance.waitForDeployment();
    
    // Transfer ownership of Bank to addr1 so supportsToken check passes
    // (The supportsToken modifier calls Bank(msg.sender).supportsToken())
    // addr1 will call airDrop, so we need addr1 to be the Bank contract
    // Actually, the modifier calls Bank(msg.sender), so msg.sender must be a Bank contract
    // We need to call from the bank contract address? No - the modifier expects msg.sender to be a Bank contract
    // The simplest approach: have addr1 call through the bank contract or use a different approach
    // Let's deploy a simple contract that acts as the caller
    
    // Alternative: directly call from addr1 - the supportsToken modifier will try to call
    // Bank(addr1).supportsToken() which will fail because addr1 is not a contract
    // We need to create a test where the caller is a contract that implements supportsToken
    
    // Deploy a caller contract that implements supportsToken
    const CallerFactory = await ethers.getContractFactory("Bank");
    const caller = await CallerFactory.deploy();
    await caller.waitForDeployment();
    
    // Have the caller contract call airDrop on the ModifierEntrancy contract
    // The caller needs to have zero token balance
    // Call airDrop via the caller contract
    const tx = await caller.connect(owner).supportsToken(); // Just to verify it works
    
    // Now call airDrop from the caller contract address
    // Since caller is a Bank contract, supportsToken modifier will pass
    // The caller has zero balance, so hasNoBalance modifier passes
    // The original require will pass, but the mutant's require will fail
    
    // We need a way to call airDrop from the caller contract
    // Let's add a function to the caller contract - but we can't modify it
    // Better approach: use the fact that the contract IS the msg.sender
    // We need to call airDrop such that msg.sender is the caller contract
    
    // Create a simple interface to call via low-level call
    const abi = ["function airDrop()"];
    const iface = new ethers.Interface(abi);
    const data = iface.encodeFunctionData("airDrop", []);
    
    // Have the caller contract execute a call to airDrop
    // Since caller is a contract with supportsToken, it will pass the modifier
    // But we can't directly call from a contract without a fallback or function
    
    // Simplest valid approach: deploy a wrapper that calls airDrop
    const WrapperFactory = await ethers.getContractFactory("Bank");
    const wrapper = await WrapperFactory.deploy();
    await wrapper.waitForDeployment();
    
    // Use the wrapper's address to call airDrop directly
    // The supportsToken modifier will call Bank(wrapper.address).supportsToken()
    // which returns the correct hash, so it passes
    // The wrapper has zero token balance, so hasNoBalance passes
    
    // Connect as the wrapper and call airDrop
    const instanceAsWrapper = instance.connect(wrapper);
    
    // This should succeed on original but revert on mutant
    // On mutant, the require with <= will always revert because (balance + 20) <= balance is false
    await expect(instanceAsWrapper.airDrop()).to.not.be.reverted;
    
    // Verify the balance increased
    expect(await instance.tokenBalance(await wrapper.getAddress())).to.equal(20);
  });
});