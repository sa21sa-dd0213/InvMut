import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant m9fdf44a2 - Transfer event emission in _tokenBuyTransferReward", function () {
  it("should emit Transfer event from contract to recipient when allowed sender transfers amount >= minTxnAmount", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with mock Uniswap router (use a simple address for testing)
    const mockRouter = "0x0000000000000000000000000000000000000001";
    const mockUSDToken = "0x0000000000000000000000000000000000000002";
    
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(mockRouter, mockUSDToken);
    await instance.waitForDeployment();
    
    // Get the contract address
    const contractAddress = await instance.getAddress();
    
    // Set minTxnAmount to a small value for testing
    await instance.setMinTxnAmount(ethers.parseEther("1"));
    
    // Transfer tokens to addr1 so they have balance
    await instance.transfer(addr1.address, ethers.parseEther("1000"));
    
    // Get the current reward rate and percent
    const rewardRate = await instance.rewardRate();
    const percent = await instance.percent();
    const minTxn = await instance.minTxnAmount();
    
    // Calculate expected reward
    const transferAmount = ethers.parseEther("10"); // >= minTxnAmount
    const expectedReward = (transferAmount * rewardRate) / percent;
    
    // Perform transfer and check for Transfer event from contract
    const tx = await instance.connect(addr1).transfer(addr2.address, transferAmount);
    const receipt = await tx.wait();
    
    // Check if Transfer event was emitted from contract address to recipient
    const transferEvent = receipt.logs.find(
      (log: any) => log.address === contractAddress && 
               log.topics[0] === ethers.id("Transfer(address,address,uint256)") &&
               log.topics[1] === ethers.zeroPadValue(contractAddress, 32)
    );
    
    expect(transferEvent).to.not.be.undefined;
    
    // Decode the event to verify the recipient and amount
    const decodedEvent = ethers.AbiCoder.defaultAbiCoder().decode(
      ["address", "uint256"],
      ethers.dataSlice(transferEvent!.data, 0)
    );
    
    // Verify recipient is addr2
    expect(decodedEvent[0].toLowerCase()).to.equal(addr2.address.toLowerCase());
    
    // Verify reward amount is correct
    expect(decodedEvent[1]).to.equal(expectedReward);
    
    // Also verify that txReward mapping was updated for recipient
    const recipientReward = await instance.txReward(addr2.address);
    expect(recipientReward).to.equal(expectedReward);
  });
});