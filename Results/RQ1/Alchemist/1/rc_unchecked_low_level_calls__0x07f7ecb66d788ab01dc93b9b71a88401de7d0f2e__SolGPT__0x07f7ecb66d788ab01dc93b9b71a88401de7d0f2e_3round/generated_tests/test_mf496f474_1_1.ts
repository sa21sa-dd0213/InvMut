import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - mf496f474", function () {
  it("should kill mutant by triggering win at difficulty/2 which fails under difficulty-2 logic", async function () {
    const [owner, whale, player] = await ethers.getSigners();
    
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    
    let foundWin = false;
    let attempts = 0;
    
    while (!foundWin && attempts < 100) {
      const instance = await Factory.deploy(whale.address, betLimit);
      await instance.waitForDeployment();
      await instance.connect(owner).AdjustDifficulty(8);
      await instance.connect(owner).OpenToThePublic();
      
      await instance.connect(player).wager({ value: betLimit });
      const wagerBlock = await ethers.provider.getBlock("latest");
      const blockNumber = wagerBlock!.number;
      
      await ethers.provider.send("evm_mine");
      
      // Calculate expected winningNumber
      const blockHash = (await ethers.provider.getBlock(blockNumber))!.hash;
      const randomSeed = 0n;
      const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "address", "uint256"],
        [blockHash, player.address, randomSeed]
      );
      const hash = ethers.keccak256(encoded);
      const winningNumber = (BigInt(hash) % 8n) + 1n;
      
      if (winningNumber === 4n) {
        const tx = await instance.connect(player).play();
        const receipt = await tx.wait();
        
        // Check events to verify it worked
        const winEvent = receipt!.logs.find(
          (log: any) => log.fragment?.name === "Win"
        );
        expect(winEvent).to.not.be.undefined;
        foundWin = true;
      }
      attempts++;
    }
    
    expect(foundWin).to.be.true;
  });
});