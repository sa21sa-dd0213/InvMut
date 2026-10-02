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

    // Deploy a simple caller contract that implements supportsToken
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