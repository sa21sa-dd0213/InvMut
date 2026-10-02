import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant m5fe82436 test", function () {
  it("should detect exponentiation operator mutation by verifying transfer amount", async function () {
    const [owner, from, to] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tos = [to.address];
    const v = 2;
    const decimals = 1;
    
    // Original calculation: v * 10 ** decimals = 2 * 10 = 20
    // Mutant calculation: v ** 10 ** decimals = 2 ** 10 = 1024
    // We expect the transfer to succeed with original behavior (value 20)
    // The mutant will attempt to transfer 1024, which may fail or behave differently

    const tx = instance.transfer(from.address, to.address, tos, v, decimals);
    
    // If the mutant transfers the wrong amount (1024 instead of 20),
    // the call may succeed but with incorrect value - we need to check
    // that the transfer happened with the expected amount
    
    // Since we can't directly check the internal call, we verify the transaction
    // doesn't revert (original behavior) - the mutant might also not revert
    // but will transfer the wrong value
    
    // More robust: deploy a simple token that tracks transferFrom calls
    // and verify the correct value was passed
    
    // For this test, we'll deploy a minimal receiver contract to observe the call
    const ReceiverFactory = await ethers.getContractFactory("Receiver");
    const receiver = await ReceiverFactory.deploy();
    await receiver.waitForDeployment();

    const tos2 = [receiver.target];
    const tx2 = await instance.transfer(from.address, receiver.target, tos2, v, decimals);
    await tx2.wait();
    
    // Check the receiver recorded the value passed in the transferFrom call
    const recordedValue = await receiver.lastValue();
    
    // Original would be 20, mutant would be 1024
    expect(recordedValue).to.equal(20);
  });
});

// Helper contract to capture the transferFrom call value
// This must be deployed as a separate contract
// contract Receiver {
//     uint256 public lastValue;
//     function transferFrom(address, address, uint256 value) external returns (bool) {
//         lastValue = value;
//         return true;
//     }
// }