import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant detection - m07e4ef40", function () {
  it("should detect Wager event emitting incorrect amount (msg.value+1 instead of msg.value)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1");
    const whaleAddress = addr1.address;
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, betLimit);
    await instance.waitForDeployment();
    
    // Open to public
    await instance.OpenToThePublic();
    
    // Prepare to capture event
    const wagerAmount = ethers.parseEther("1");
    
    // Call wager and capture the event
    const tx = await instance.connect(addr1).wager({ value: wagerAmount });
    const receipt = await tx.wait();
    
    // Find the Wager event
    const event = receipt.logs.find(
      (log: any) => {
        try {
          const parsedLog = instance.interface.parseLog({
            topics: [...log.topics],
            data: log.data
          });
          return parsedLog?.name === "Wager";
        } catch {
          return false;
        }
      }
    );
    
    // Parse the event
    const parsedEvent = instance.interface.parseLog({
      topics: [...event.topics],
      data: event.data
    });
    
    // Assert that the event reports the actual amount sent (not msg.value+1)
    expect(parsedEvent.args.amount).to.equal(wagerAmount);
  });
});