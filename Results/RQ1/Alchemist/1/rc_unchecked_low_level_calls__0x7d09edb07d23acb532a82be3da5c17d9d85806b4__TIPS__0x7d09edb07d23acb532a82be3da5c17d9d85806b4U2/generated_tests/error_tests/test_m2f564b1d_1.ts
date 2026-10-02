import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - hasPlayerWagered always returns false", function () {
  it("should return true for hasPlayerWagered after a player has wagered, but mutant returns false", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1.0");
    const whaleAddress = owner.address; // using owner as whale for simplicity

    // Deploy the contract with required constructor arguments
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, betLimit);
    await instance.waitForDeployment();

    // Open the contract to the public (onlyOwner)
    await instance.connect(owner).OpenToThePublic();

    // Have addr1 place a wager
    const wagerTx = await instance.connect(addr1).wager({ value: betLimit });
    await wagerTx.wait();

    // Call hasPlayerWagered with addr1's address - should return true
    const result = await instance.connect(owner).hasPlayerWagered(addr1.address);
    
    // On the original contract this returns true, on the mutant it returns false
    expect(result).to.equal(true);
  });
});