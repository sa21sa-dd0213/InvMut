import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant kill test - mf8934603", function () {
  it("should revert when Bank returns a larger bytes32 value than the expected hash (kills <= mutant)", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the ModifierEntrancy contract (no constructor arguments)
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const modifierEntrancy = await ModifierEntrancyFactory.deploy();
    await modifierEntrancy.waitForDeployment();

    // Deploy a malicious Bank contract that returns a bytes32 value numerically greater than keccak256("Nu Token")
    const MaliciousBankFactory = await ethers.getContractFactory("MaliciousBank");
    const maliciousBank = await MaliciousBankFactory.deploy();
    await maliciousBank.waitForDeployment();

    // Attacker calls airDrop() through the malicious Bank contract
    // The attacker's address in the context of the modifier is msg.sender = maliciousBank contract
    // We need to call from the maliciousBank contract, so we use attacker as the signer
    // But the actual call must come from the maliciousBank contract address
    // We'll use the maliciousBank to call modifierEntrancy.airDrop()
    const maliciousBankAsSigner = maliciousBank.connect(attacker);
    
    // The maliciousBank's supportsToken() returns a value greater than the expected hash
    // This should pass the <= check in the mutant but fail the == check in the original
    await expect(
      maliciousBankAsSigner.callAttack(modifierEntrancy.target)
    ).to.be.reverted;
  });
});