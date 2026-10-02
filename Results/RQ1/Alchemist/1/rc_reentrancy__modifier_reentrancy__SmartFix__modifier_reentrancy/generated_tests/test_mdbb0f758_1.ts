import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant detection", function () {
  it("should detect mutant that replaces >= with <= in airDrop", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Bank contract first (needed for supportsToken check)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // Deploy ModifierEntrancy (no constructor arguments)
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await ModifierEntrancyFactory.deploy();
    await instance.waitForDeployment();
    
    // Ensure user has zero balance initially
    expect(await instance.tokenBalance(user.address)).to.equal(0);
    
    // Call airDrop from user's address, but impersonate Bank contract for supportsToken check
    // The user needs to be a contract that implements supportsToken - we'll use the Bank contract
    // Actually, the supportsToken modifier calls Bank(msg.sender).supportsToken()
    // So msg.sender must be a Bank contract. Let's test via the Bank contract calling airDrop on ModifierEntrancy
    
    // The Bank contract doesn't have the ability to call airDrop directly
    // Instead, we need to understand the intended flow:
    // The supportsToken modifier checks that Bank(msg.sender).supportsToken() returns the correct hash
    // So msg.sender must be a contract that returns the correct keccak256("Nu Token")
    
    // Let's create a simple contract that can call airDrop and supports the token
    const attackerFactory = await ethers.getContractFactory("Bank"); // Bank already returns correct hash
    const attacker = await attackerFactory.deploy();
    await attacker.waitForDeployment();
    
    // Now we need to call airDrop from the attacker contract
    // But attacker is a Bank contract that doesn't have an airDrop-calling function
    // Let's use the owner to set up a proper test
    
    // Actually, the simplest approach: the test should work if we call from the Bank contract itself
    // Since Bank(msg.sender) is checked, we need msg.sender to be the Bank contract
    
    // Let's use a different approach - deploy a simple caller contract
    const callerCode = `
      contract Caller {
        function callAirDrop(address target) external returns (bool) {
          (bool success, ) = target.call(abi.encodeWithSignature("airDrop()"));
          return success;
        }
        function supportsToken() external pure returns (bytes32) {
          return keccak256(abi.encodePacked("Nu Token"));
        }
      }
    `;
    
    const CallerFactory = await ethers.getContractFactory(callerCode);
    const caller = await CallerFactory.deploy();
    await caller.waitForDeployment();
    
    // Call airDrop through the caller contract
    const tx = await caller.callAirDrop(await instance.getAddress());
    await tx.wait();
    
    // In the original contract, this should succeed and increase balance
    // In the mutant, it will revert because tokenBalance[msg.sender] + 20 <= tokenBalance[msg.sender] is false
    // Since caller's balance is 0, the condition 20 <= 0 is false, so it reverts
    
    // Check that the balance increased (original behavior)
    const balance = await instance.tokenBalance(await caller.getAddress());
    expect(balance).to.equal(20);
  });
});