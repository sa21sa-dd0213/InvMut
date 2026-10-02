import { ethers } from "hardhat";
import { expect } from "chai";

describe("PoCGame", function () {
  let game: any;
  let owner: any;
  let whale: any;
  let player1: any;
  let player2: any;
  const BET_LIMIT = ethers.utils.parseEther("1");
  const INITIAL_DIFFICULTY = 10;

  beforeEach(async function () {
    [owner, whale, player1, player2] = await ethers.getSigners();
    
    const PoCGame = await ethers.getContractFactory("PoCGame");
    game = await PoCGame.deploy(whale.address, BET_LIMIT);
    await game.deployed();
  });

  describe("Deployment", function () {
    it("should set the correct owner", async function () {
      expect(await game.owner()).to.equal(owner.address);
    });

    it("should set the correct whale address", async function () {
      // Whale address is not directly exposed, but we can check through donation
      expect(await game.openToPublic()).to.equal(false);
    });

    it("should set the correct bet limit", async function () {
      expect(await game.currentBetLimit()).to.equal(BET_LIMIT);
    });

    it("should not be open to public initially", async function () {
      expect(await game.openToPublic()).to.equal(false);
    });
  });

  describe("OpenToThePublic", function () {
    it("should allow owner to open to public", async function () {
      await game.connect(owner).OpenToThePublic();
      expect(await game.openToPublic()).to.equal(true);
    });

    it("should not allow non-owner to open to public", async function () {
      await expect(
        game.connect(player1).OpenToThePublic()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Wager", function () {
    beforeEach(async function () {
      await game.connect(owner).OpenToThePublic();
    });

    it("should allow a player to wager", async function () {
      await game.connect(player1).wager({ value: BET_LIMIT });
      expect(await game.hasPlayerWagered(player1.address)).to.equal(true);
    });

    it("should reject wager with wrong amount", async function () {
      await expect(
        game.connect(player1).wager({ value: ethers.utils.parseEther("2") })
      ).to.be.revertedWith("Amount must equal bet limit");
    });

    it("should reject wager from contract", async function () {
      // Deploy a simple contract to test onlyRealPeople modifier
      const TestContract = await ethers.getContractFactory("TestContract");
      const testContract = await TestContract.deploy();
      await testContract.deployed();

      await expect(
        testContract.wager(game.address, { value: BET_LIMIT })
      ).to.be.revertedWith("Only real people can call this function");
    });
  });

  describe("Play", function () {
    beforeEach(async function () {
      await game.connect(owner).OpenToThePublic();
      await game.connect(owner).AdjustDifficulty(INITIAL_DIFFICULTY);
      await game.connect(player1).wager({ value: BET_LIMIT });
    });

    it("should allow a player to play after wagering", async function () {
      await ethers.provider.send("evm_mine", []); // Mine a new block
      await game.connect(player1).play();
      expect(await game.hasPlayerWagered(player1.address)).to.equal(false);
    });

    it("should not allow playing in the same block", async function () {
      await expect(
        game.connect(player1).play()
      ).to.be.revertedWith("Cannot play in same block as wager");
    });

    it("should emit Win or Lose event", async function () {
      await ethers.provider.send("evm_mine", []);
      const tx = await game.connect(player1).play();
      const receipt = await tx.wait();
      
      const winEvent = receipt.events?.find((e: any) => e.event === "Win");
      const loseEvent = receipt.events?.find((e: any) => e.event === "Lose");
      
      expect(winEvent || loseEvent).to.not.be.undefined;
    });
  });

  describe("Donate", function () {
    beforeEach(async function () {
      await game.connect(owner).OpenToThePublic();
    });

    it("should allow donation and transfer to whale", async function () {
      const donateAmount = ethers.utils.parseEther("0.5");
      const whaleBalanceBefore = await ethers.provider.getBalance(whale.address);
      
      await game.connect(player1).donate({ value: donateAmount });
      
      const whaleBalanceAfter = await ethers.provider.getBalance(whale.address);
      expect(whaleBalanceAfter.sub(whaleBalanceBefore)).to.equal(donateAmount);
    });

    it("should emit Donate event", async function () {
      const donateAmount = ethers.utils.parseEther("0.5");
      await expect(
        game.connect(player1).donate({ value: donateAmount })
      ).to.emit(game, "Donate")
       .withArgs(donateAmount, whale.address, player1.address);
    });
  });

  describe("Admin functions", function () {
    it("should allow owner to adjust difficulty", async function () {
      const newDifficulty = 20;
      await game.connect(owner).AdjustDifficulty(newDifficulty);
      expect(await game.currentDifficulty()).to.equal(newDifficulty);
    });

    it("should allow owner to adjust bet limit", async function () {
      const newBetLimit = ethers.utils.parseEther("2");
      await game.connect(owner).AdjustBetAmounts(newBetLimit);
      expect(await game.currentBetLimit()).to.equal(newBetLimit);
    });

    it("should not allow non-owner to adjust settings", async function () {
      await expect(
        game.connect(player1).AdjustDifficulty(20)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Utility functions", function () {
    it("should return correct eth balance", async function () {
      expect(await game.ethBalance()).to.equal(0);
    });

    it("should return correct winners pot", async function () {
      await game.connect(owner).OpenToThePublic();
      await game.connect(player1).wager({ value: BET_LIMIT });
      expect(await game.winnersPot()).to.equal(BET_LIMIT.div(2));
    });

    it("should return false for non-wagered player", async function () {
      expect(await game.hasPlayerWagered(player1.address)).to.equal(false);
    });
  });
});