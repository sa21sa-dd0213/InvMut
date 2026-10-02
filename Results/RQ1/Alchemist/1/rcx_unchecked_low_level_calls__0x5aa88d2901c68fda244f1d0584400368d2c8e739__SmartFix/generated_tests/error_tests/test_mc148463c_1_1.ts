import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant test - kill mc148463c", function () {
  it("should execute multiplicate when msg.value > contract balance, but mutant only executes on exact equality", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const contractAddress = await instance.getAddress();
    
    // Fund the contract with some initial balance
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });
    
    // Get initial balances
    const initialContractBalance = await ethers.provider.getBalance(contractAddress);
    const initialAddr2Balance = await ethers.provider.getBalance(addr2.address);
    
    // Send value greater than current contract balance (e.g., 15 ETH > 10 ETH)
    // Original: should pass because 15 >= 10
    // Mutant: should fail because 15 == 10 is false
    const tx = instance.connect(owner).multiplicate(addr2.address, {
      value: ethers.parseEther("15")
    });
    
    // The mutant will fail to execute the transfer because msg.value != contract balance
    // So the contract balance will remain unchanged and addr2 will not receive funds
    await expect(tx).to.changeEtherBalance(addr2, ethers.parseEther("25"));
  });
});