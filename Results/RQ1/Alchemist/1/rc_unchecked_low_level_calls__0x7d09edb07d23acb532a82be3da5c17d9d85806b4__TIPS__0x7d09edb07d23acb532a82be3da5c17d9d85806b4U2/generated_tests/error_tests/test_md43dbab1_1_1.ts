import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant detection - onlyRealPeople modifier", function () {
  it("should revert when a contract calls wager() via the onlyRealPeople modifier, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the main PoCGame contract with constructor arguments: whale address and wager limit
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(addr1.address, betLimit);
    await instance.waitForDeployment();

    // Open the contract to the public
    await instance.connect(owner).OpenToThePublic();

    // Deploy a malicious contract that will call wager() on PoCGame
    const MaliciousFactory = await ethers.getContractFactory("MaliciousCaller");
    const malicious = await MaliciousFactory.deploy(await instance.getAddress());
    await malicious.waitForDeployment();

    // Fund the malicious contract with enough ETH to make the wager
    await owner.sendTransaction({
      to: await malicious.getAddress(),
      value: betLimit
    });

    // Attempt to call wager() through the malicious contract
    // In the original contract, this should revert because msg.sender != tx.origin
    // In the mutant, the require check is removed, so it should succeed
    await expect(
      malicious.connect(addr1).callWager({ value: betLimit })
    ).to.be.reverted; // This will fail (not revert) on the mutant, thus killing it
  });
});

// Helper contract to simulate a contract calling PoCGame contract
contract MaliciousCaller {
    address public pocGame;

    constructor(address _pocGame) {
        pocGame = _pocGame;
    }

    function callWager() external payable {
        (bool success, ) = pocGame.call{value: msg.value}(abi.encodeWithSignature("wager()"));
        require(success, "wager call failed");
    }

    receive() external payable {}
}