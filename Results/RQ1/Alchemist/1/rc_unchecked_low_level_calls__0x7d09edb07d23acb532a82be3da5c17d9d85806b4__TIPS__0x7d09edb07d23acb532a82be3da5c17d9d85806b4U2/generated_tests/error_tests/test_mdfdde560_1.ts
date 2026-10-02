import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant mdfdde560 - kill test for removed onlyRealPeople modifier on wager", function () {
  it("should revert when a contract attempts to call wager on original, but succeed on mutant (killing it)", async function () {
    const [owner, whale, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1.0");

    // Deploy PoCGame with required constructor arguments (whaleAddress, wagerLimit)
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();

    // Open the game to public (only owner can do this)
    await instance.connect(owner).OpenToThePublic();

    // Deploy a malicious contract that will try to call wager on PoCGame
    const AttackerFactory = await ethers.getContractFactory("ContractCaller");
    const attacker = await AttackerFactory.deploy();

    // Fund the attacker contract so it can send the betLimit
    await player.sendTransaction({
      to: attacker.target,
      value: betLimit
    });

    // Attempt to call wager from the contract - this should revert in original due to onlyRealPeople
    // but in mutant it will succeed (killing the mutant)
    await expect(
      attacker.connect(player).callWager(instance.target, { value: betLimit })
    ).to.be.revertedWith(""); // Empty revert reason expected from require(msg.sender == tx.origin)
  });
});

// Helper contract that acts as a contract caller (msg.sender != tx.origin)
contract ContractCaller {
  function callWager(address gameAddress) external payable {
    (bool success, ) = gameAddress.call{value: msg.value}(abi.encodeWithSignature("wager()"));
    require(success, "wager call failed");
  }
}