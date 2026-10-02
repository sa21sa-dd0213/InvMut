import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant m63d00bbe - Approval event emission", function () {
  it("should emit Approval event when approve is called; mutant removes the event emission", async function () {
    const [owner, spender] = await ethers.getSigners();

    // Deploy ANCHToken - need to provide constructor arguments
    // Constructor requires: address _route, address _USDToken
    // We need a UniswapV2 router address - we'll use a zero address as it's just for deployment
    // The USD token can be a dummy address
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(
      "0x0000000000000000000000000000000000000001", // _route (dummy Uniswap router)
      "0x0000000000000000000000000000000000000002"  // _USDToken (dummy USD token)
    );
    await instance.waitForDeployment();

    // Call approve with a specific amount
    const amount = ethers.parseEther("100");

    // Get the transaction and check for the Approval event
    const tx = await instance.connect(owner).approve(spender.address, amount);
    const receipt = await tx.wait();

    // Check that the Approval event was emitted with correct parameters
    const event = receipt.logs.find(
      (log) => {
        try {
          const parsed = instance.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          return parsed.name === "Approval";
        } catch {
          return false;
        }
      }
    );

    // If the mutant removed the event emission, event will be undefined
    // The original contract emits the event, so this assertion should pass on original
    expect(event).to.not.be.undefined;

    if (event) {
      const parsedEvent = instance.interface.parseLog({
        topics: event.topics,
        data: event.data
      });
      expect(parsedEvent.args.owner).to.equal(owner.address);
      expect(parsedEvent.args.spender).to.equal(spender.address);
      expect(parsedEvent.args.value).to.equal(amount);
    }
  });
});